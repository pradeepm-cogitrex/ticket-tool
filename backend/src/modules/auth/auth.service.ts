import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthUser, JwtPayload } from '../../common/interfaces/auth-user.interface';
import { EmployeeRepo } from '../masters/employee/employee.repo';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly employeeRepo: EmployeeRepo,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const employee = await this.employeeRepo.findByEmailWithPassword(dto.email.trim().toLowerCase());
    const valid = employee ? await bcrypt.compare(dto.password, employee.passwordHash) : false;
    if (!employee || !valid) throw new UnauthorizedException('Email or password is incorrect');
    if (!employee.isActive) throw new UnauthorizedException('This account is inactive. Ask an admin to activate it.');

    await this.employeeRepo.update(employee.id, { lastLoginAt: new Date() });

    const payload: JwtPayload = { sub: employee.id, email: employee.email, name: employee.name, role: employee.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: employee.id, name: employee.name, email: employee.email, role: employee.role },
    };
  }

  async me(user: AuthUser) {
    const employee = await this.employeeRepo.findDetail(user.id);
    if (!employee) throw new NotFoundException('User not found');
    return employee;
  }
}
